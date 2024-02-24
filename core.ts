import { randomUUID } from 'crypto'
import type { Request } from 'express'

export class LongPollingTask<Input, Output> {
  protected listeners: Array<(output: Output) => void> = []

  constructor(public readonly id: string, public readonly input: Input) {}

  toJSON() {
    return {
      id: this.id,
      input: this.input,
    }
  }

  public dispatchResult(output: Output): void {
    for (let listener of this.listeners) {
      try {
        listener(output)
      } catch (error) {
        console.error(error)
      }
    }
    this.listeners.length = 0
  }

  addListener(listener: (output: Output) => void): void {
    this.listeners.push(listener)
  }

  removeListener(listener: (output: Output) => void): void {
    let index = this.listeners.indexOf(listener)
    if (index !== -1) {
      this.listeners.splice(index, 1)
    }
  }
}

let defaultPollingInterval = 1000 * 30

/** @description redirect with 307 to let client retry */
function defaultOnTimeout(req: Request): void {
  req.res?.redirect(307, req.url)
}

export class LongPollingTaskQueue<
  Input,
  Output,
  Task extends LongPollingTask<Input, Output> = LongPollingTask<Input, Output>,
> {
  protected pollingInterval: number

  /**
   * @description list of pending request from workers
   */
  protected pendingTaskListeners: Array<(task: Task) => void> = []

  /**
   * @description list of pending tasks for workers that are not completed
   */
  protected pendingTasks: Task[] = []

  /**
   * @description list of all tasks for client, both completed or not completed tasks.
   */
  protected allTasks: Record<string, Task> = {}

  constructor(options?: {
    /** @default 30 seconds */
    pollingInterval?: number
  }) {
    this.pollingInterval = options?.pollingInterval || defaultPollingInterval
  }

  /**
   * @description create task from client
   */
  public addTask(options: {
    /** @default randomUUID */
    id?: string | (() => string)
    input: Input
  }) {
    let id: string =
      typeof options.id === 'string' ? options.id : (options.id || randomUUID)()

    let task = new LongPollingTask<Input, Output>(id, options.input) as Task

    this.pendingTasks.push(task)
    this.allTasks[id] = task

    let listener = this.pendingTaskListeners.shift()
    if (listener) {
      listener(task)
    }

    return { id }
  }

  protected getFirstTask(): Task | null {
    if (this.pendingTasks.length == 0) return null
    return this.pendingTasks[0]
  }

  protected getRandomTask(): Task | null {
    if (this.pendingTasks.length == 0) return null
    let index = Math.floor(Math.random() * this.pendingTasks.length)
    return this.pendingTasks[index]
  }

  protected popTaskById(id: string): Task | null {
    let index = this.pendingTasks.findIndex(task => task.id == id)
    if (index === -1) return null

    let task = this.pendingTasks[index]
    this.pendingTasks.splice(index, 1)
    return task
  }

  protected waitTask(
    req: Request,
    onTask: (task: Task) => void,
    onTimeout = defaultOnTimeout,
  ): void {
    this.pendingTaskListeners.push(onTask)

    let remove = () => {
      let index = this.pendingTaskListeners.indexOf(onTask)
      if (index !== -1) {
        this.pendingTaskListeners.splice(index, 1)
      }
    }

    let timer = setTimeout(() => {
      remove()
      onTimeout(req)
    }, this.pollingInterval)

    req.on('end', () => {
      remove()
      clearTimeout(timer)
    })
  }

  /**
   * @description get task from worker
   */
  public getOrWaitTask(
    getTask: 'first' | 'random',
    req: Request,
    onTask: (task: { id: string; input: Input }) => void,
    onTimeout = defaultOnTimeout,
  ): void {
    let task: Task | null = null
    if (getTask == 'first') {
      task = this.getFirstTask()
    } else if (getTask == 'random') {
      task = this.getRandomTask()
    }

    if (task) {
      onTask(task)
    } else {
      this.waitTask(req, onTask, onTimeout)
    }
  }

  /**
   * @description dispatch result from worker
   * @returns true if the task is found and deleted
   * @returns false if the task is not found (maybe already deleted)
   */
  public dispatchResult(id: string, output: Output): boolean {
    let task = this.popTaskById(id)
    if (!task) return false
    task.dispatchResult(output)
    return true
  }

  /**
   * @description get result from client (dispatched from worker)
   */
  public getOrWaitResult(
    id: string,
    req: Request,
    onOutput: (output: Output) => void,
    onTimeout = defaultOnTimeout,
  ) {
    let task = this.allTasks[id]
    if (!task) {
      throw new Error('Task not found by id: ' + id)
    }
    task.addListener(onOutput)

    let timer = setTimeout(() => {
      onTimeout(req)
      task.removeListener(onOutput)
    }, this.pollingInterval)

    req.on('end', () => {
      clearTimeout(timer)
      task.removeListener(onOutput)
    })
  }

  /**
   * @description delete completed task from client (to release memory)
   * @returns true if the task is found and deleted
   * @returns false if the task is not found (maybe already deleted)
   */
  deleteTask(id: string): boolean {
    if (id in this.allTasks) {
      delete this.allTasks[id]
      return true
    } else {
      return false
    }
  }
}
