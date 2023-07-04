require("dotenv").config();
const https = require("https");
const fs = require("fs");
const fileWrite = fs.createWriteStream("file.mp4");
const fileRead = fs.createReadStream("file.mp4");

const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.API_KEY, {polling: true});

const puppeteer = require("puppeteer");
const userAgent = require("user-agents");

bot.on("message", async msg => {
  const chatId = msg.chat.id;
  if (msg.text === "/start" || msg.text === "/restart") {
    await bot.sendMessage(chatId, "Привет! Этот бот нужен для того, чтобы скачивать видео из постов на пикабу. Чтобы начать, отправь мне ссылку на пост, а я заберу из него видео и отправлю тебе! Идет?");
  } else {
    if (msg.text.includes("pikabu.ru/")) {
      await bot.sendMessage(chatId, "Заглядываем в пост за ссылкой...");
      const browser = await puppeteer.launch({ headless: "new", defaultViewport: null });
      console.log("Браузер запущен")
      const page = await browser.newPage();
      console.log("Открыта новая страница")
      await page.setUserAgent(userAgent.toString());
      console.log("Задан юзер агент")
      await page.goto(msg.text);
      console.log("Мы попали на страницу")
      await page.waitForSelector(".story-block_type_video .player__preview");
      console.log("Мы нашли контейнер с видео")
      const result = await page.evaluate(async () => {
        console.log("Зашли в evaluate")
        document.querySelector(".story-block_type_video").dispatchEvent(new Event("click"))
        console.log("И кликнули на плей")
        return document.querySelector(".player[data-type=\"video-file\"] .player__player video source[type=\"video/mp4\"]").getAttribute("src")
      }).then(async data => {
        await bot.sendMessage(chatId, "Скачиваем файл...");
        https.get(data, async (resp) => {
          await browser.close();
          resp.pipe(fileWrite);
          await bot.sendMessage(chatId, "Отправка");
          await bot.sendVideo(chatId, fileRead, {}, {
            contentType: "application/octet-stream"
          }).then(async () => {
            await bot.sendMessage(chatId, "Вот ваше видео");
          });
        });
      });
    } else {
      await bot.sendMessage(chatId, "Я могу работать только с постами с Пикабу");
    }
  }
})