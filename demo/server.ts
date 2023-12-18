import express from 'express'
import { print } from 'listening-on'
import { PORT } from './config'
import { LongPollingTaskQueue } from '../core'

let app = express()

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

let taskQueue = new LongPollingTaskQueue()

app.post('/task', (req, res) => {
  let wait = req.query.wait != 'false'
  let task = taskQueue.addTask({
    input: req.body,
    callback(output) {
      if (wait) res.json({ output })
    },
  })
  if (!wait) res.json({ id: task.id })
})

app.get('/task', (req, res) => {
  let task = taskQueue.getFirstTask()
  if (task) {
    res.json({ task })
    return
  }
  taskQueue.waitTask(req)
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
