require("dotenv").config();
const https = require("https");
const fs = require("fs");
const fileWriteMp4 = fs.createWriteStream("file.mp4");
const fileWriteGif = fs.createWriteStream("file.gif");

const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.API_KEY, {polling: true});

const puppeteer = require("puppeteer");
const userAgent = require("user-agents");

bot.on("message", async msg => {
  const chatId = msg.chat.id;
  if (msg.text === "/start" || msg.text === "/restart") {
    await bot.sendMessage(chatId, "Привет! Этот бот нужен для того, чтобы скачивать видео из постов на пикабу. Чтобы начать, отправь мне ссылку на пост, а я заберу из него видео и отправлю тебе! Идет?");
  } else {
    if (/^https?:\/\/(?:www\.)?pikabu\.ru\/story\//.test(msg.text)) {
      bot.sendMessage(chatId, "Заглядываем в пост за ссылкой...").then(async () => {
        const browser = await puppeteer.launch({ headless: "new", defaultViewport: null });
        const page = await browser.newPage();
        await page.setUserAgent(userAgent.toString());
        await page.goto(msg.text);
        await page.waitForSelector(".app")
          .then(() => page.evaluate(() => {
            switch (document.querySelector(".player")?.dataset?.type) {
              case "video-file": {
                return document.querySelector(".player").dataset.source + ".mp4"
              }
              case "gifx": {
                return document.querySelector(".player").dataset.source
              }
            }
          }).then(data => {
              if (data?.length) {
                https.get(data, async (resp) => {
                  await browser.close();
                  if (data.indexOf(".mp4") !== -1) {
                    resp.pipe(fileWriteMp4);
                    bot.sendMessage(chatId, "Отправка").then(() => bot.sendVideo(chatId, "file.mp4"));
                  } else {
                    resp.pipe(fileWriteGif);
                    bot.sendMessage(chatId, "Отправка").then(() => bot.sendAnimation(chatId, "file.gif"));
                  }
                })
              } else {
                bot.sendMessage(chatId, "Кажется, в посте нет видео! Попробуйте другой пост");
              }
            }
          ))
          .catch(() => {
            bot.sendMessage(chatId, "Поста не существует! Попробуй другую ссылку")
          });
      })
    } else {
      await bot.sendMessage(chatId, "Я могу работать только с постами с Пикабу");
    }
  }
})