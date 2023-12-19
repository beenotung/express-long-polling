# express-long-polling

Library to implement long-polling API on express server.

[![npm Package Version](https://img.shields.io/npm/v/express-long-polling)](https://www.npmjs.com/package/express-long-polling)

## Installation

```bash
npm i express-long-polling
```

## Usage Example

See complete demo in [server.ts](./demo/server.ts), [process-task.ts](./demo/process-task.ts) and [submit-task.ts](./demo/submit-task.ts).

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
