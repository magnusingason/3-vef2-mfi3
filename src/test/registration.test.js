import { describe, expect, it } from '@jest/globals';
import { validationResult } from 'express-validator';
import {
  registrationValidationMiddleware,
  xssSanitizationMiddleware,
} from '../routes/index-routes';

// Hjálparfall sem leyfir okkur að testa express-validator middleware
// https://stackoverflow.com/questions/28769200/unit-testing-validation-with-express-validator
async function applyAllMiddlewares(req, middlewares) {
  await Promise.all(
    middlewares.map(async (middleware) => {
      await middleware(req, {}, () => undefined);
    })
  );
}

// TODO breyta og laga test

describe('registration', () => {
  it('validates', async () => {
    const req = {
      body: {
        name: '',
      },
    };

    const registrationValidationMiddleware = []; // TODO Sækja á réttan stað

    await applyAllMiddlewares(req, );

    const validation = validationResult(req);

    expect(validation.isEmpty()).toBe(false);
  });

  it('sanitizes', async () => {
    const req = {
      body: {
        name: '<script>alert(1)</script>',
      },
    };

    const xssSanitizationMiddleware = []; // TODO Sækja á réttan stað

    await applyAllMiddlewares(req, xssSanitizationMiddleware);

    expect(req.body.name).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
