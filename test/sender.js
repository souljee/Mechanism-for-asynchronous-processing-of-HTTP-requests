const axios = require('axios');

const messageData = {
    key: 'value',
};

const numberOfRequests = 100;
const requestDelay = 10;

async function sendRequests() {
    try {
        for (let i = 0; i < numberOfRequests; i++) {
            await axios.post('http://localhost:3000', messageData);
            console.log(`Запрос ${i + 1} отправлен.`);
            await waitTimeout(requestDelay);
        }
    } catch (error) {
        console.error(error.message);
    }
}

function waitTimeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

sendRequests();
