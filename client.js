const amqplib = require('amqplib');
const config = require('config');
const generateSafeId = require('generate-safe-id');

const state = {
  ch: null
};

const fibonacciHandler = n =>
  new Promise(async (resolve, reject) => {
    try {
      const corrId = generateSafeId();
      const q = await state.ch.assertQueue('', { exclusive: true });

      state.ch.consume(
        q.queue,
        msg => {
          if (msg.properties.correlationId === corrId) {
            resolve({
              n,
              r: msg.content.toString()
            });
          }
        },
        { noAck: true }
      );

      state.ch.sendToQueue('fibonacci-rpc-q', Buffer.from(n.toString()), {
        correlationId: corrId,
        replyTo: q.queue
      });
    } catch (error) {
      reject(error);
    }
  });

amqplib
  .connect(config.get('rabbitUrl'))
  .then(async conn => {
    state.ch = await conn.createChannel();

    const q = await state.ch.assertQueue('', { exclusive: true });

    const id = generateSafeId();

    const n = 10;

    const nums = [1, 2, 4, 5, 6, 7, 8, 9, 10];

    // receive response value and continue process
    const results = await Promise.all(nums.map(fibonacciHandler));

    results.forEach(r => console.log(`result: ${JSON.stringify(r)}`));

    console.log(`Client is running ...`);
  })
  .catch(console.error);
