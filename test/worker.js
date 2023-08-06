const amqp = require('amqplib');
const winston = require('winston');

const queueName = 'task_queue';

// Логгер
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'm2-service' },
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

// Подключение к RabbitMQ серверу
amqp.connect('amqp://localhost')
    .then((connection) => connection.createChannel())
    .then((channel) => {
        // Создаем очередь, если её нет
        return channel.assertQueue(queueName, { durable: true })
            .then(() => {
                channel.consume(queueName, (message) => {
                    const task = JSON.parse(message.content.toString());
                    logger.info('Получено задание:', { task });

                    const result = { message: 'Задание успешно обработано' };

                    channel.sendToQueue(message.properties.replyTo, Buffer.from(JSON.stringify(result)), {
                        correlationId: message.properties.correlationId,
                    });

                    logger.info('Результат обработки задания отправлен в очередь:', { result });

                    // Подтверждаем обработку задания
                    channel.ack(message);
                });
            });
    })
    .catch((error) => {
        logger.error('Ошибка при подключении к RabbitMQ:', { error: error.message });
    });
