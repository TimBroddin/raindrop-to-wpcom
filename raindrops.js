const fetch = require("node-fetch");

class Raindrops {
    constructor(token) {
        this.token = token;
    }

    async call(url, method = "GET") {
        const response = await fetch(`https://api.raindrop.io${url}`, {
            method: method,
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
        });
        return await response.json();
    }
}

module.exports = Raindrops;
