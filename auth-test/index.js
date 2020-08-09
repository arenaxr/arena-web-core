const express = require('express')
const app = express()
const port = 8888

app.get('/', (req, res) => {
    res.send('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb25peCIsImlhdCI6MTU5Njg3NDA4OCwiZXhwIjoxNjI4NDEwMDg4fQ.6Z_zmxmQDw7WTdtXa6MtHa7isMlJ1YOyIv_nwpmfRO4')
})

app.listen(port, () => {
    console.log(`Auth test app listening at port ${port}`)
})