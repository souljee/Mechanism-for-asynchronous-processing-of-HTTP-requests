const express = require('express');
const amqp = require('amqplib');
const winston = require('winston');

const app = express();
const queueName = 'task_queue';
const replyQueueName = 'reply_queue';


const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'm1-service' },
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

// Парсинг тела HTTP запроса в формате JSON
app.use(express.json());

let channel;

// Подключение к RabbitMQ серверу и создание очередей
async function connectToRabbitMQ() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        channel = await connection.createChannel();

        await channel.assertQueue(queueName, { durable: true });
        await channel.assertQueue(replyQueueName, { durable: false });

        logger.info('Соединение с RabbitMQ установлено и очереди созданы.');

        //Слушаем очередь для ответа от M2
        channel.consume(replyQueueName, (message) => {
            const data = JSON.parse(message.content.toString());
            const { correlationId, result } = data;
            logger.info('Получен результат задания от M2:', { result });

            channel.ack(message);
        });
    } catch (error) {
        logger.error('Ошибка при подключении к RabbitMQ:', { error: error.message });
        throw error;
    }
}

// Обработка HTTP запроса и отправка в очередь RabbitMQ
app.post('/', async (req, res) => {
    try {
        if (!channel) {
            await connectToRabbitMQ();
        }

        const correlationId = generateUuid();

        // Отправляем сообщение в очередь с содержимым тела HTTP запроса
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify({ request: req.body, replyQueue: replyQueueName, correlationId })), {
            persistent: true,
        });

        logger.info('Запрос успешно отправлен в очередь.', { request: req.body });

        res.status(202).json({ message: 'Request accepted.' });
    } catch (error) {
        logger.error('Ошибка при отправке запроса в очередь:', { error: error.message });
        res.status(500).send('Произошла ошибка при отправке запроса в очередь.');
    }
});

app.listen(3000, () => {
    logger.info('Сервер М1 запущен на порту 3000');
});
app.get('/startm1', (req, res) => {
    res.send('Это GET-запрос на /method');
});
app.post('/method', (req, res) => {
    res.send('Это POST-запрос на /method');
});
app.get('/', (req, res) => {
    res.send('Привет! Это микросервис М1.');
});

function generateUuid() {
    return Math.random().toString() + Math.random().toString() + Math.random().toString();
}
