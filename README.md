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

app.get('/task', (req, res) => {
  let task = taskQueue.getFirstTask()
  if (task) {
    res.json({ task })
  } else {
    taskQueue.waitTask(req)
  }
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

export class LongPollingTaskQueue<Input, Output> {
  constructor(options?: { pollingInterval?: number })

  addTask(options: {
    id?: string
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
```

## License

This project is licensed with [BSD-2-Clause](./LICENSE)

This is free, libre, and open-source software. It comes down to four essential freedoms [[ref]](https://seirdy.one/2021/01/27/whatsapp-and-the-domestication-of-users.html#fnref:2):

- The freedom to run the program as you wish, for any purpose
- The freedom to study how the program works, and change it so it does your computing as you wish
- The freedom to redistribute copies so you can help others
- The freedom to distribute copies of your modified versions to others
