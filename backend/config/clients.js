module.exports = [
    {
        id: 1,
        name: "Vgipl",
        url: "http://192.168.1.64:3000",
        description: "SIEM",
        graylogConfig: {
            url: "http://192.168.1.68:9000/api/search/universal/absolute",
            username: "admin",
            password: "Virtual%09",
            streamId: "67c7e72cb78cd271d6481222",
            query: "*" // Default query to match all logs
        }
    },
    {
        id: 2,
        name: "Buldhana",
        url: "http://103.76.143.84:3000",
        description: "SIEM - Buldhana",
        graylogConfig: {
            url: "http://192.168.1.68:9000/api/search/universal/absolute",
            username: "admin",
            password: "Virtual%09",
            streamId: "67c7e72cb78cd271d6481222",
            query: "*" // Default query to match all logs
        }
    }
];