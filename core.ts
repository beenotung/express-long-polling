import { randomUUID } from 'crypto'
import type { Request } from 'express'

export class LongPollingTask<Input, Output> {
  constructor(
    public readonly id: string,
    public readonly input: Input,
    protected readonly callback: (output: Output) => void,
  ) {}

  toJSON() {
    return {
      id: this.id,
      input: this.input,
    }
  }

  public dispatchResult(output: Output): void {
    this.callback(output)
  }
}

let defaultPollingInterval = 1000 * 30

/** @description redirect with 307 to let client retry */
function defaultOnTimeout(req: Request): void {
  req.res?.redirect(307, req.url)
}

type TaskListener<Task> = {
  onTask(task: Task, req: Request): void
  req: Request
}

export class LongPollingTaskQueue<
  Input,
  Output,
  Task extends LongPollingTask<Input, Output> = LongPollingTask<Input, Output>,
> {
  protected pollingInterval: number
  protected taskListeners: TaskListener<Task>[] = []

  protected pendingTasks: Task[] = []

  constructor(options?: {
    /** @default 30 seconds */
    pollingInterval?: number
  }) {
    this.pollingInterval = options?.pollingInterval || defaultPollingInterval
  }

  public addTask(options: {
    /** @default randomUUID */
    id?: string | (() => string)
    input: Input
    callback: (output: Output) => void
  }) {
    let id: string =
      typeof options.id === 'string' ? options.id : (options.id || randomUUID)()
    let task = new LongPollingTask<Input, Output>(
      id,
      options.input,
      options.callback,
    ) as Task
    this.pendingTasks.push(task)
    let listener = this.taskListeners.shift()
    if (listener) {
      listener.onTask(task, listener.req)
    }
    return task
  }

  public getFirstTask(): Task | null {
    if (this.pendingTasks.length == 0) return null
    return this.pendingTasks[0]
  }

  public getRandomTask(): Task | null {
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

  public waitTask(
    req: Request,
    onTask: (task: Task, req: Request) => void,
    onTimeout = defaultOnTimeout,
  ): void {
    let listener: TaskListener<Task> = {
      onTask,
      req,
    }
    this.taskListeners.push(listener)
    let remove = (cb?: (req: Request) => void) => {
      let index = this.taskListeners.indexOf(listener)
      if (index == -1) return
      this.taskListeners.splice(index, 1)
      cb?.(req)
    }
    let timer = setTimeout(() => {
      remove(onTimeout)
    }, this.pollingInterval)
    req.on('end', () => {
      clearTimeout(timer)
      remove()
    })
  }

  public getOrWaitTask(
    getTask: 'first' | 'random' | (() => Task | null),
    req: Request,
    onTask: (task: Task, req: Request) => void,
    onTimeout = defaultOnTimeout,
  ): void {
    let task =
      getTask == 'first'
        ? this.getFirstTask()
        : getTask === 'random'
        ? this.getRandomTask()
        : getTask()
    if (task) {
      onTask(task as Task, req)
    } else {
      this.waitTask(req, onTask, onTimeout)
    }
  }

  public dispatchResult(id: string, output: Output): Task | null {
    let task = this.popTaskById(id)
    task?.dispatchResult(output)
    return task
  }
}
