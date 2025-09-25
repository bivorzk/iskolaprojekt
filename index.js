const express = require('express');
const passwordHash = require('./passwordhash');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello from Express!');
});

// Example route using passwordHash
app.post('/hash-password', (req, res) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }
    const hash = passwordHash.hash(password);
    res.json({ hash });
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
