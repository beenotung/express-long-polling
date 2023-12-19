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

export class LongPollingTaskQueue<Input, Output> {
  protected pollingInterval: number
  protected pollingRequests: Request[] = []

  protected pendingTasks: LongPollingTask<Input, Output>[] = []

  constructor(options?: { pollingInterval?: number }) {
    this.pollingInterval = options?.pollingInterval || defaultPollingInterval
  }

  public addTask(options: {
    id?: string // default random
    input: Input
    callback: (output: Output) => void
  }) {
    let task = new LongPollingTask<Input, Output>(
      options.id || randomUUID(),
      options.input,
      options.callback,
    )
    this.pendingTasks.push(task)
    this.pollingRequests.shift()?.res?.json({ task })
    return task
  }

  public getFirstTask(): LongPollingTask<Input, Output> | null {
    if (this.pendingTasks.length == 0) return null
    return this.pendingTasks[0]
  }

  public getRandomTask(): LongPollingTask<Input, Output> | null {
    if (this.pendingTasks.length == 0) return null
    let index = Math.floor(Math.random() * this.pendingTasks.length)
    return this.pendingTasks[index]
  }

  protected popTaskById(id: string): LongPollingTask<Input, Output> | null {
    let index = this.pendingTasks.findIndex(task => task.id == id)
    if (index === -1) return null

    let task = this.pendingTasks[index]
    this.pendingTasks.splice(index, 1)
    return task
  }

  public waitTask(req: Request) {
    this.pollingRequests.push(req)
    let remove = (cb?: () => void) => {
      let index = this.pollingRequests.indexOf(req)
      if (index == -1) return
      this.pollingRequests.splice(index, 1)
      cb?.()
    }
    let timer = setTimeout(() => {
      remove(() => {
        req.res?.redirect(307, req.url)
      })
    }, this.pollingInterval)
    req.on('end', () => {
      clearTimeout(timer)
      remove()
    })
  }

  public dispatchResult(
    id: string,
    output: Output,
  ): LongPollingTask<Input, Output> | null {
    let task = this.popTaskById(id)
    task?.dispatchResult(output)
    return task
  }
}
