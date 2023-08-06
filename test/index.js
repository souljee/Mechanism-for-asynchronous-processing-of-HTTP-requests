// Запуск микросервиса М1 (HTTP сервер)
require('./app');

// Запуск микросервиса М2 (Worker для RabbitMQ)
require('./worker');
