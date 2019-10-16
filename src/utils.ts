import { IO } from '@redux-saga/symbols'
import { THROW_ERROR, FINALIZE, ErrorPattern, SagaOutput } from './types/runner'

export function next(iterator: Iterator<any>, value: any) {
  if (value !== null && typeof value === 'object') {
    if (THROW_ERROR in value) return iterator.throw!(value.error)
    if (FINALIZE in value) return iterator.return!()
  }

  return iterator.next(value)
}

export function isEffect(obj: Object) {
  return obj !== null && typeof obj === 'object' && IO in obj
}

export function createAssert(
  assert: (output: SagaOutput) => boolean,
  reverse: boolean,
) {
  return (output: SagaOutput) => (reverse ? !assert(output) : assert(output))
}

export function matchError(error: Error, pattern: ErrorPattern) {
  if (typeof error !== 'object') error = { name: '', message: error }
  if (!error.message) return false

  if (typeof pattern === 'string' && error.message.includes(pattern)) {
    return true
  }

  if (pattern instanceof RegExp && pattern.test(error.message)) {
    return true
  }

  if (
    pattern instanceof Error &&
    error.name === pattern.name &&
    error.message === pattern.message
  ) {
    return true
  }

  if (typeof pattern === 'function' && error instanceof pattern) {
    return true
  }

  return false
}

export function createError(message: string, stack?: Function): Error {
  const error = new Error(message)

  if (stack) {
    const limit = Error.stackTraceLimit
    Error.stackTraceLimit = 1
    Error.captureStackTrace(error, stack)
    Error.stackTraceLimit = limit
  }

  return error
}
