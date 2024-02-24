import { PORT } from './config'

async function main() {
  let api_origin = 'http://localhost:' + PORT

  let res = await fetch(api_origin + '/task', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ startTime: Date.now() }),
  })
  let { id } = await res.json()
  console.log('submitted task:', { id })

  res = await fetch(api_origin + '/task/result?id=' + id)
  let { output } = await res.json()
  console.log('task output:', output)
}
main().catch(e => console.error(e))
