const express = require('express');
const amqp = require('amqplib');
const winston = require('winston');

const app = express();
const queueName = 'task_queue';

// Логгер
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

// Подключение к RabbitMQ серверу
amqp.connect('amqp://localhost')
    .then((connection) => connection.createChannel())
    .then((channel) => {
        // Создаем очередь, если её нет
        return channel.assertQueue(queueName, { durable: true })
            .then(() => {
                // Обработка HTTP запроса и отправка в очередь RabbitMQ
                app.post('/', async (req, res) => {
                    try {
                        // Отправляем сообщение в очередь с содержимым тела HTTP запроса
                        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(req.body)), {
                            persistent: true, // Сохраняем сообщение на диске, чтобы не потерять при перезапуске RabbitMQ
                        });

                        logger.info('Запрос успешно отправлен в очередь.', { request: req.body });

                        res.status(200).send('Запрос успешно отправлен в очередь.');
                    } catch (error) {
                        logger.error('Ошибка при отправке запроса в очередь:', { error: error.message });
                        res.status(500).send('Произошла ошибка при отправке запроса в очередь.');
                    }
                });

                // Запуск сервера на порту 3000
                app.listen(3000, () => {
                    logger.info('Сервер М1 запущен на порту 3000');
                });
                app.get('/', (req, res) => {
                    res.send('Привет! Это микросервис М1.');
                });
            });
    })
    .catch((error) => {
        logger.error('Ошибка при подключении к RabbitMQ:', { error: error.message });
    });
