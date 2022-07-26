"use strict";
const Raindrops = require("./raindrops");
const wpcom = require("wpcom")(process.env.wpToken);

const trim = (str, length) => {
    if (str.length > length) {
        return str.substring(0, length - 4) + "...";
    }
    return str;
};

const removeHtml = (str) => str.replace(/<[^>]*>/g, "");

const getWeekNumber = () => {
    const currentdate = new Date();
    const oneJan = new Date(currentdate.getFullYear(), 0, 1);
    const numberOfDays = Math.floor(
        (currentdate - oneJan) / (24 * 60 * 60 * 1000)
    );
    const result = Math.ceil((currentdate.getDay() + 1 + numberOfDays) / 7);
    return result;
};

module.exports.run = async (event, context) => {
    const time = new Date();
    const raindropsApi = new Raindrops(process.env.raindropToken);

    const { items } = await raindropsApi.call(
        `/rest/v1/raindrops/${process.env.raindropCollection}?sort=-created`
    );
    const lastWeek = items.filter(
        (item) => new Date(item.created) > time.setDate(time.getDate() - 7)
    );

    // get all tags from lastWeek items
    const tags = lastWeek.reduce((acc, item) => {
        const { tags } = item;
        if (tags) {
            tags.forEach((tag) => {
                if (!acc.includes(tag)) {
                    acc.push(tag);
                }
            });
        }
        return acc;
    }, []);

    if (lastWeek.length) {
        const content = `${lastWeek
            .map(
                (item) =>
                    `<p><a href="${
                        item.link
                    }" target="_blank" rel="noopener noreferrer">${
                        item.title
                    }</a>${
                        item.excerpt
                            ? `<br />${trim(removeHtml(item.excerpt), 140)}`
                            : ""
                    }</p>\n\n`
            )
            .join("")}`;
        const weekNumber = getWeekNumber();
        await wpcom.site(process.env.wpSite).addPost({
            title: `Weekly linkdump (week ${weekNumber})`,
            content,
            status: "draft",
            categories: "English",
            excerpt: "My weekly linkdump.",
            tags,
        });
    }
    console.log(`Your cron function "${context.functionName}" ran at ${time}`);
};
