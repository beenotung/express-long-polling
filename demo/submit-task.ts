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
  let json = await res.json()
  console.log('submit task result:', json)
}
main().catch(e => console.error(e))
