import { body } from 'express-validator';
import xss from 'xss';

// Endurnýtum mjög líka validation

export function registrationValidationMiddleware(textField) {
  return [
    body('name')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Nafn má ekki vera tómt'),
    body('name')
      .isLength({ max: 64 })
      .withMessage('Nafn má að hámarki vera 64 stafir'),
    body(textField)
      .isLength({ max: 400 })
      .withMessage(
        `${
          textField === 'comment' ? 'Athugasemd' : 'Lýsing'
        } má að hámarki vera 400 stafir`
      ),
  ];
}

// Viljum keyra sér og með validation, ver gegn „self XSS“
export function xssSanitizationMiddleware(textField) {
  return [
    body('name').customSanitizer((v) => xss(v)),
    body(textField).customSanitizer((v) => xss(v)),
  ];
}

export function sanitizationMiddleware(textField) {
  return [body('name').trim().escape(), body(textField).trim().escape()];
}
