import { PORT } from './config'

async function main() {
  let api_origin = 'http://localhost:' + PORT

  let res = await fetch(api_origin + '/task')
  let {
    task: { id, input },
  } = await res.json()

  let endTime = Date.now()
  let usedTime = endTime - input.startTime
  let output = { endTime, usedTime }

  console.log('process task:', {
    id,
    input,
    output,
  })

  res = await fetch(api_origin + '/task/result', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, output }),
  })
}

main().catch(e => console.error(e))
