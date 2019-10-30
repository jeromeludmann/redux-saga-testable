# About

[`redux-saga`](https://github.com/redux-saga/redux-saga) is an awesome [`redux`](https://github.com/reduxjs/redux) middleware that avoids coupling between logic and side effects. It allows us to test the sagas in a pure way due to the ability of the generator functions to receive data from the outside.

The drawback is that we have to manually iterate over the generator function for each yielded effect. It makes the tests not very intuitive to write and noisy to read.

When testing a saga, we should not have to worry about what the generator function does behind. We would just like to check some arbitrary effects and optionally map effects to some values instead of triggering side effects.

[`redux-saga-testable`](https://github.com/jeromeludmann/redux-saga-testable) tries to make it easier.

Inspired by [`redux-saga-test-plan`](https://github.com/jfairbank/redux-saga-test-plan) and [`redux-saga-test-engine`](https://github.com/timbuckley/redux-saga-test-engine).
