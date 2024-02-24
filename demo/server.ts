import express from 'express'
import { print } from 'listening-on'
import { PORT } from './config'
import { LongPollingTaskQueue } from '../core'

let app = express()

app.use(express.json())

let taskQueue = new LongPollingTaskQueue({ pollingInterval: 2000 })

app.use((req, res, next) => {
  console.log(req.method, req.url, req.body)
  next()
})

// POST /task
app.post('/task', (req, res) => {
  let { id } = taskQueue.addTask({
    input: req.body,
  })
  res.json({ id })
})

// GET /task
app.get('/task', (req, res) => {
  taskQueue.getOrWaitTask('random', req, ({ id, input }) =>
    res.json({ id, input }),
  )
})

// POST /task/result
app.post('/task/result', (req, res) => {
  let { id, output } = req.body
  let found = taskQueue.dispatchResult(id, output)
  if (found) {
    res.status(201)
    res.json({})
  } else {
    res.status(404)
    res.json({ error: 'Task not found by id: ' + id })
  }
})

// GET /task/result?id=123
app.get('/task/result', (req, res) => {
  let { id } = req.query
  if (typeof id !== 'string') {
    res.status(400)
    res.json({ error: 'expect task id in req.query' })
    return
  }
  taskQueue.getOrWaitResult(id, req, output => {
    res.json({ output })
  })
})

// DELETE /task?id=123
app.delete('/task', (req, res) => {
  let { id } = req.query
  if (typeof id !== 'string') {
    res.status(400)
    res.json({ error: 'expect task id in req.query' })
    return
  }
  let deleted = taskQueue.deleteTask(id)
  res.json({ deleted })
})

app.listen(PORT, () => {
  print(PORT)
})
