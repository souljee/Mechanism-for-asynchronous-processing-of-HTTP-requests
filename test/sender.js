const axios = require('axios');

const messageData = {
    key: 'value',
};

const numberOfRequests = 100000;

async function sendRequests() {
    try {
        for (let i = 0; i < numberOfRequests; i++) {
            await axios.post('http://localhost:3000', messageData);
            console.log(`Запрос ${i + 1} отправлен.`);
        }
    } catch (error) {
        console.error(error.message);
    }
}

sendRequests();
