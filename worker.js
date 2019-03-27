const config = require('config');
const amqplib = require('amqplib');
const state = {
  ch: null
};

const rabbitUrl = config.get('rabbitUrl');

const fibonacci = n => {
  if (n == 0 || n == 1) return n;
  else return fibonacci(n - 1) + fibonacci(n - 2);
};

const handler = msg => {
  const n = parseInt(msg.content.toString());

  console.log(' [.] fib(%d)', n);

  console.log(`calculate fibonacci of: ${n}`);
  const r = fibonacci(n);
  console.log(`fibonacci of ${n} is ${r}`);

  state.ch.sendToQueue(msg.properties.replyTo, Buffer.from(r.toString()), {
    correlationId: msg.properties.correlationId
  });

  state.ch.ack(msg);
};

amqplib
  .connect(rabbitUrl)
  .then(async conn => {
    try {
      state.ch = await conn.createChannel();
      const q = 'fibonacci-rpc-q';
      await state.ch.assertQueue(q, { durable: true });

      state.ch.consume(q, handler);

      console.log(`Finonacci worker is running ...`);
    } catch (error) {
      console.error(error);
    }
  })
  .catch(e => {
    console.error(e);
  });
