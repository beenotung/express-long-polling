import express from 'express'
import { print } from 'listening-on'
import { PORT } from './config'
import { LongPollingTaskQueue } from '../core'

let app = express()

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

app.listen(PORT, () => {
  print(PORT)
})
