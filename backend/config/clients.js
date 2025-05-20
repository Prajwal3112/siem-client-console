// backend/config/clients.js
module.exports = [
    {
        "id": 1,
        "name": "Virtual Galaxy",
        "url": "http://192.168.1.64:3000",
        "description": "Organization",
        "graylog": {
            "host": "192.168.1.68:9000",
            "username": "admin",
            "password": "Virtual%09",
            "streamId": "67c7e72cb78cd271d6481222"
        }
    },
    {
        "id": 2,
        "name": "Yavatmal Bank",
        "url": "http://103.76.143.84:3000",
        "description": "Banking Service",
        "graylog": {
            "host": "192.168.77.79:9000",
            "username": "admin",
            "password": "Virtual%09",
            "streamId": "67d53d99e9cf8f1270270d1f"
        }
    },
    {
        "id": 3,
        "name": "VGIL PUBLIC",
        "url": "http://115.245.81.14:3000",
        "description": "public ip",
        "graylog": {
            "host": "192.168.1.68:9000",
            "username": "admin",
            "password": "Virtual%09",
            "streamId": "67c7e72cb78cd271d6481222"
        }
    }
];