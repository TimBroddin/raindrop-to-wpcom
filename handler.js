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
    const categories = [
        { slug: "coding", name: "Coding" },
        { slug: "tech", name: "Tech" },
        { slug: "gaming", name: "Gaming" },
        { slug: "music", name: "Music" },
        { slug: "funny", name: "Funny" },
    ];

    const time = new Date();
    const raindropsApi = new Raindrops(process.env.raindropToken);

    const { items } = await raindropsApi.call(
        `/rest/v1/raindrops/${process.env.raindropCollection}?sort=-created`
    );
    const lastWeek = items.filter((item) => {
        const time = new Date();
        time.setDate(time.getDate() - 7);
        return new Date(item.created).getTime() > time.getTime();
    });

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
        const groupedByCategory = [];
        categories.forEach((category) => {
            lastWeek.forEach((item) => {
                if (item.tags.includes(category.slug)) {
                    if (
                        groupedByCategory.find(
                            (group) => group.category === category.name
                        )
                    ) {
                        groupedByCategory
                            .find((group) => group.category === category.name)
                            .items.push(item);
                    } else {
                        groupedByCategory.push({
                            category: category.name,
                            items: [item],
                        });
                    }
                }
            });
        });

        const others = lastWeek.filter((item) => {
            return !item.tags.some((tag) =>
                categories.filter((c) => c.slug === tag)
            );
        });

        if (others) {
            groupedByCategory.push({
                category: "Misc",
                items: others,
            });
        }

        const content = `${groupedByCategory
            .map(
                (category) =>
                    `<h2>${category.category}</h2>\n${category.items
                        .map(
                            (item) =>
                                `<p><a href="${
                                    item.link
                                }" target="_blank" rel="noopener noreferrer">${
                                    item.title
                                }</a>${
                                    item.excerpt
                                        ? `<br />${trim(
                                              removeHtml(item.excerpt),
                                              140
                                          )}`
                                        : ""
                                }</p>\n\n`
                        )
                        .join("\n\n")}`
            )
            .join("")}`;

        const weekNumber = getWeekNumber();
        const post = {
            title: `Weekly linkdump (week ${weekNumber})`,
            content,
            status: "publish",
            categories: "English, Linkdump",
            excerpt: "My weekly linkdump.",
            tags,
        };
        if (process.env.PREVIEW) {
            console.log(post);
        } else {
            await wpcom.site(process.env.wpSite).addPost(post);
        }
    }
    console.log(`Your cron function "${context.functionName}" ran at ${time}`);
};
