# express-long-polling

Library to implement long-polling API on express server.

[![npm Package Version](https://img.shields.io/npm/v/express-long-polling)](https://www.npmjs.com/package/express-long-polling)

## Installation

```bash
npm i express-long-polling
```

## Usage Example

See complete demo in [server.ts](./demo/server.ts), [process-task.ts](./demo/process-task.ts) and [submit-task.ts](./demo/submit-task.ts).

```typescript
import express from 'express'
import cors from 'cors'
import { print } from 'listening-on'
import { LongPollingTaskQueue } from 'express-long-polling'

let app = express()

app.use(cors())
app.use(express.json())

let taskQueue = new LongPollingTaskQueue()

app.post('/task', (req, res) => {
  taskQueue.addTask({
    input: req.body,
    callback(output) {
      res.json({ output })
    },
  })
})

app.get('/task/first', (req, res) => {
  let task = taskQueue.getFirstTask()
  if (task) {
    res.json({ task })
  } else {
    taskQueue.waitTask(req, task => res.json({ task }))
  }
})

app.get('/task/random', (req, res) => {
  let task = taskQueue.getRandomTask()
  if (task) {
    res.json({ task })
  } else {
    taskQueue.waitTask(req, task => res.json({ task }))
  }
})

app.get('/task/any', (req, res) => {
  taskQueue.getOrWaitTask('random', req, task => res.json({ task }))
})

app.post('/task/result', (req, res) => {
  let { id, output } = req.body
  let task = taskQueue.dispatchResult(id, output)
  if (task) {
    res.status(201)
  } else {
    res.status(404)
  }
  res.json({})
})

let PORT = 8100
app.listen(PORT, () => {
  print(PORT)
})
```

## Typescript Signature

```typescript
import type { Request } from 'express'

export class LongPollingTask<Input, Output> {
  id: string
  input: Input
  dispatchResult(output: Output): void
}

/** @description redirect with 307 to let client retry */
function defaultOnTimeout(req: Request): void {
  req.res?.redirect(307, req.url)
}

export class LongPollingTaskQueue<Input, Output> {
  constructor(options?: { pollingInterval?: number })

  addTask(options: {
    /** @default randomUUID */
    id?: string | (() => string)
    input: Input
    callback: (output: Output) => void
  }): LongPollingTask<Input, Output>

  getFirstTask(): LongPollingTask<Input, Output> | null

  getRandomTask(): LongPollingTask<Input, Output> | null

  waitTask(req: Request): void

  dispatchResult(
    id: string,
    output: Output,
  ): LongPollingTask<Input, Output> | null
}

export class LongPollingTaskQueue<
  Input,
  Output,
  Task extends LongPollingTask<Input, Output> = LongPollingTask<Input, Output>,
> {
  constructor(options?: {
    /** @default 30 seconds */
    pollingInterval?: number
  })

  addTask(options: {
    /** @default randomUUID */
    id?: string | (() => string)
    input: Input
    callback: (output: Output) => void
  }): Task

  getFirstTask(): Task | null

  getRandomTask(): Task | null

  waitTask(
    req: Request,
    onTask: (task: Task, req: Request) => void,
    onTimeout?: typeof defaultOnTimeout,
  ): void

  getOrWaitTask(
    getTask: 'first' | 'random' | (() => Task | null),
    req: Request,
    onTask: (task: Task, req: Request) => void,
    onTimeout?: typeof defaultOnTimeout,
  ): void

  dispatchResult(id: string, output: Output): Task | null
}
```

## License

This project is licensed with [BSD-2-Clause](./LICENSE)

This is free, libre, and open-source software. It comes down to four essential freedoms [[ref]](https://seirdy.one/2021/01/27/whatsapp-and-the-domestication-of-users.html#fnref:2):

- The freedom to run the program as you wish, for any purpose
- The freedom to study how the program works, and change it so it does your computing as you wish
- The freedom to redistribute copies so you can help others
- The freedom to distribute copies of your modified versions to others
