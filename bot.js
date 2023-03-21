#!/usr/bin/env node

/*!
 * Streamtape Telegram Bot
 * Copyright (c) 2023
 *
 * @author Zubin
 * @username (GitHub) losparviero
 * @license AGPL-3.0
 */

// Add env vars as a preliminary

require("dotenv").config();
const { Bot, session, InputFile, GrammyError, HttpError } = require("grammy");
const { hydrateReply, parseMode } = require("@grammyjs/parse-mode");
const { run, sequentialize } = require("@grammyjs/runner");
const { hydrate } = require("@grammyjs/hydrate");
const st = require("streamtape");
const axios = require("axios");
const fs = require("fs");

// Bot

const bot = new Bot(process.env.BOT_TOKEN);

// Auth

const user = process.env.API_USER;
const pass = process.env.API_PASS;

// Concurrency

function getSessionKey(ctx) {
  return ctx.chat?.id.toString();
}

// Plugins

bot.use(sequentialize(getSessionKey));
bot.use(session({ getSessionKey }));
bot.use(responseTime);
bot.use(log);
bot.use(admin);
bot.use(hydrate());
bot.use(hydrateReply);

// Parse

bot.api.config.use(parseMode("Markdown"));

// Admin

const admins = process.env.BOT_ADMIN?.split(",").map(Number) || [];
async function admin(ctx, next) {
  ctx.config = {
    botAdmins: admins,
    isAdmin: admins.includes(ctx.chat?.id),
  };
  await next();
}

// Response

async function responseTime(ctx, next) {
  const before = Date.now();
  await next();
  const after = Date.now();
  console.log(`Response time: ${after - before} ms`);
}

// Log

async function log(ctx, next) {
  const from = ctx.from;
  const name =
    from.last_name === undefined
      ? from.first_name
      : `${from.first_name} ${from.last_name}`;
  console.log(
    `From: ${name} (@${from.username}) ID: ${from.id}\nMessage: ${ctx.message.text}`
  );

  const msgText = ctx.message.text;

  if (!msgText.includes("/") && !admins.includes(ctx.chat?.id)) {
    await bot.api.sendMessage(
      process.env.BOT_ADMIN,
      `<b>From: ${ctx.from.first_name} (@${ctx.from.username}) ID: <code>${ctx.from.id}</code></b>`,
      { parse_mode: "HTML" }
    );
    await ctx.api.forwardMessage(
      process.env.BOT_ADMIN,
      ctx.chat.id,
      ctx.message.message_id
    );
  }

  await next();
}

// Commands

bot.command("start", async (ctx) => {
  await ctx
    .reply(
      "*Welcome!* ✨  Send a Streamtape link.\n_Note that videos less than 50MB are supported due to Telegram restrictions._"
    )
    .then(() => console.log("New user added:", ctx.from));
});

bot.command("help", async (ctx) => {
  await ctx
    .reply(
      "*@anzubo Project.*\n\nThis bot uses the Streamtape API to download videos. You are required to follow Streamtape's TOS.\n_You will not download anything of an illegal and/or adult nature._"
    )
    .then(console.log(`Help command message sent to ${ctx.chat.id}`));
});

// Streamtape

bot.on("message::url", async (ctx) => {
  let url = ctx.message.text;
  const streamtapeUrlRegex = /https:\/\/(www\.)?streamtape\.com\/v\/(.*)/;

  if (!streamtapeUrlRegex.test(ctx.message.text)) {
    await ctx.reply("*Send a Streamtape link!*", {
      reply_to_message_id: ctx.msg.message_id,
    });
    return;
  }

  const statusMessage = await ctx.reply("*Downloading*");
  const downloadUrl = await st.download(url, user, pass);

  // Download

  const filename = "video.mp4";

  await axios({
    url: downloadUrl.url,
    method: "GET",
    responseType: "stream",
  })
    .then(async (response) => {
      const file = fs.createWriteStream(filename);
      response.data.pipe(file);

      return new Promise((resolve, reject) => {
        file.on("finish", resolve);
        file.on("error", reject);
      });
    })
    .then(async () => {
      await ctx.replyWithVideo(new InputFile("./video.mp4"), {
        reply_to_message_id: ctx.message.message_id,
      });
    })
    .catch(async (error) => {
      console.log(`Failed to download file: ${error}`);
      await ctx.reply("*Failed to download file.*", {
        reply_to_message_id: ctx.message.message_id,
      });
    });

  await fs.unlinkSync("./video.mp4");
  await statusMessage.delete();
});

// Messages

bot.on("message", async (ctx) => {
  await ctx.reply("*Send a valid Streamtape link.*");
});

// Error

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(
    "Error while handling update",
    ctx.update.update_id,
    "\nQuery:",
    ctx.msg.text
  );
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
    if (e.description === "Forbidden: bot was blocked by the user") {
      console.log("Bot was blocked by the user");
    } else {
      ctx.reply("An error occurred");
    }
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

// Run

run(bot);
