[![Build Status](https://secure.travis-ci.org/disqus/heka-node.png)](http://travis-ci.org/disqus/heka-node)

A NodeJS library for generating and sending metrics logging to a heka listener.

To run the test suite use:

```shell
npm test
```

You should see all tests pass with something that looks like this ::

```shell
> heka-node@0.6.0 test C:\Users\BYK\Documents\Projects\Disqus\heka-node
> jasmine-node --captureExceptions tests

............................................................

Finished in 0.585 seconds
60 tests, 256 assertions, 0 failures, 0 skipped
```

You can find a working HTTP echo server in the example directory.
Just run make, and it will install heka from npm and start a web server
that emits heka messages for you.

```shell
node example/demo.js
myapp listening at http://0.0.0.0:8000
```

Go to [http://localhost:8000/echo/foo](http://localhost:8000/echo/foo) to start sending heka messages
over UDP to localhost:5565.
