import express from 'express';

const app = express();
const startedAt = new Date().toISOString();
const model = process.env.PROVIDER_MODEL ?? 'llama-3.2-1b-instruct';

app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.json({
    service: 'aibtc-legion-provider',
    network: 'stacks-testnet',
    model,
    status: 'ok',
    startedAt,
    routes: ['/health', '/v1/models', '/v1/chat/completions'],
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', model, network: 'stacks-testnet', startedAt });
});

app.get('/v1', (_req, res) => {
  res.json({ object: 'provider.root', model, status: 'ok' });
});

app.get('/v1/models', (_req, res) => {
  res.json({
    object: 'list',
    data: [
      {
        id: model,
        object: 'model',
        owned_by: 'fy-aibtc-legion-testnet',
      },
    ],
  });
});

app.post('/v1/chat/completions', (req, res) => {
  const last = Array.isArray(req.body?.messages) ? req.body.messages.at(-1)?.content : '';
  res.json({
    id: `chatcmpl-testnet-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: `AIBTC testnet provider sanity response from ${model}. Received: ${String(last ?? '').slice(0, 160)}`,
        },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
});

const port = Number(process.env.PORT ?? 8788);
app.listen(port, () => {
  console.log(`AIBTC Legion provider endpoint listening on ${port}`);
});
