import fetch from 'node-fetch';

async function run() {
  const res = await fetch('http://localhost:3000/api/consultar-estado', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      claveAcceso: "2412202507179210356800120050010002092220400500116",
      ambiente: "produccion"
    })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

run();
