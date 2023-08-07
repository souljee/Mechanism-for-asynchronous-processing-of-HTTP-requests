const amqp = require('amqplib');
const winston = require('winston');

const queueName = 'task_queue';

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

async function startWorker() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        await channel.assertQueue(queueName, { durable: true });

        logger.info('Сервер М2 запущен и готов принимать задания.');

        // Обработка сообщений из очереди
        channel.consume(queueName, async (message) => {
            try {
                const data = JSON.parse(message.content.toString());

                logger.info('Получено задание:', { task: data.request });

                const result = { message: 'Задание успешно обработано' };

                // Отправляем результат обратно в очередь М1
                channel.sendToQueue(data.replyQueue, Buffer.from(JSON.stringify({ correlationId: data.correlationId, result })), {
                    persistent: true,
                });

                logger.info('Результат обработки задания отправлен в очередь:', { result });

                // Подтверждаем обработку задания
                channel.ack(message);
            } catch (error) {
                channel.reject(message, false);
                logger.error('Ошибка при обработке задания:', { error: error.message });
            }
        });
    } catch (error) {
        logger.error('Ошибка при подключении к RabbitMQ:', { error: error.message });
    }
}

startWorker();
