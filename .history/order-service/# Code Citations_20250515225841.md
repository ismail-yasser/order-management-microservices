# Code Citations

## License: unknown
https://github.com/trinhtinhve/nab-code-challenge/blob/09e240d18677cdd3d8d903423ad15d614875ac5c/order-service/src/common/logger.js

```
);
const logger
```


## License: unknown
https://github.com/trinhtinhve/nab-code-challenge/blob/09e240d18677cdd3d8d903423ad15d614875ac5c/order-service/src/common/logger.js

```
);
const logger = winston.createLogger({
  level: 'info',
  
```


## License: unknown
https://github.com/trinhtinhve/nab-code-challenge/blob/09e240d18677cdd3d8d903423ad15d614875ac5c/order-service/src/common/logger.js

```
);
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: {
```


## License: unknown
https://github.com/trinhtinhve/nab-code-challenge/blob/09e240d18677cdd3d8d903423ad15d614875ac5c/order-service/src/common/logger.js

```
);
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'order-service' },
  transports: [
```


## License: unknown
https://github.com/trinhtinhve/nab-code-challenge/blob/09e240d18677cdd3d8d903423ad15d614875ac5c/order-service/src/common/logger.js

```
);
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'order-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log
```


## License: unknown
https://github.com/trinhtinhve/nab-code-challenge/blob/09e240d18677cdd3d8d903423ad15d614875ac5c/order-service/src/common/logger.js

```
);
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'order-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.
```


## License: unknown
https://github.com/trinhtinhve/nab-code-challenge/blob/09e240d18677cdd3d8d903423ad15d614875ac5c/order-service/src/common/logger.js

```
);
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'order-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }
```

