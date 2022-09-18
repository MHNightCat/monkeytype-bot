import _ from "lodash";
import { connectDB } from "../functions/mongodb";
import { connectRedis } from "../functions/redis";
import * as fs from "fs";
import type { MonkeyTypes } from "../types/types";
import { parseJSON, readFileOrCreate } from "../functions/file";
import { Client } from "../structures/client";
import {
  ApplicationCommandChoicesOption,
  ApplicationCommandData,
  ApplicationCommandOption,
  Guild
} from "discord.js";
import fetch from "node-fetch";

const HOUR = 60 * 60 * 1000;

export default {
  event: "ready",
  run: async (client) => {
    console.log(`${client.user.tag} is online!`);
    sendReadyMessage(client);

    const guild = await client.guild;

    if (guild === undefined) {
      console.log("Could not get guild");

      return;
    }

    connectDatabases(client);

    const hourlyUpdates = (): void => {
      setActivity(client, guild);
      fetchLabels(client);
      sendLatestRelease(client);
    };

    hourlyUpdates();

    setInterval(hourlyUpdates, HOUR);
  }
} as MonkeyTypes.Event<"ready">;

async function fetchLabels(client: Client<true>): Promise<void> {
  console.log("Fetching GitHub labels...");

  const response = await fetch(
    `https://api.github.com/repos/${client.clientOptions.repo}/labels`
  );

  if (response.status !== 200) {
    console.log(`Could not fetch labels:\n${response.statusText}`);

    return;
  }

  const json = (await response.json()) as MonkeyTypes.GitHubLabel[];

  const labelNames = json.map((label) => label.name);

  fs.writeFileSync("labels.json", JSON.stringify(labelNames, null, 2));

  console.log("Labels updated!");

  updateIssueCommand(client);
}

async function updateIssueCommand(client: Client<true>): Promise<void> {
  console.log("Updating issue command...");

  const labels = parseJSON<string[]>(readFileOrCreate("labels.json", "[]"));

  const labelOption: ApplicationCommandOption = {
    name: "label",
    description: "Add a label to the issue",
    type: "STRING",
    required: false,
    choices: labels.map((label) => ({
      name: label,
      value: label
    }))
  };

  const issueCommand = client.application.commands.cache.find(
    (command) => command.name === "issue"
  );

  if (issueCommand === undefined) {
    console.log("Could not find issue command");

    return;
  }

  if (
    _.isEqual(
      (issueCommand.options[2] as ApplicationCommandChoicesOption).choices,
      labelOption.choices
    )
  ) {
    console.log("Issue command already up to date");

    return;
  }

  issueCommand.options = [
    ...issueCommand.options.slice(0, 2),
    {
      ...labelOption,
      name: "label1"
    },
    {
      ...labelOption,
      name: "label2"
    },
    {
      ...labelOption,
      name: "label3"
    }
  ];

  await issueCommand.edit(issueCommand as ApplicationCommandData);

  console.log("Issue command updated!");
}

async function sendLatestRelease(client: Client<true>): Promise<void> {
  console.log("Fetching latest release...");

  const guild = await client.guild;

  if (guild === undefined) {
    console.log("Could not get guild");

    return;
  }

  const channel = await client.getChannel("updates");

  if (channel === undefined) {
    console.log("Could not get update channel");

    return;
  }

  const response = await fetch(
    `https://api.github.com/repos/${client.clientOptions.repo}/releases/latest`
  );

  if (response.status !== 200) {
    console.log(`Could not fetch latest release:\n${response.statusText}`);

    return;
  }

  const json = (await response.json()) as MonkeyTypes.GitHubRelease;

  const { name, body, created_at: createdAtStr } = json;

  const createdAt = new Date(createdAtStr);

  if (Date.now() - createdAt.getTime() > HOUR) {
    console.log("Latest release is too old");

    return;
  }

  const updateRole = guild.roles.cache.get(
    client.clientOptions.roles.updatePingRole
  );

  if (updateRole === undefined) {
    console.log("Could not get update ping role");

    return;
  }

  const lines = body.split("\n").reverse();

  const max = 1992; // to account for ```\n\n```

  const messages = [
    `${updateRole}\n**Monkeytype ${name}**`,
    ...lines
      .reduce<string[][]>(
        (acc, line) => {
          const prev = acc.at(-1)!;

          prev.join("\n").length + line.length > max
            ? acc.push([line])
            : prev.push(line);

          return acc;
        },
        [[]]
      )
      .map((arr) => `\`\`\`\n${arr.join("\n")}\n\`\`\``)
  ];

  for (const message of messages) {
    await channel.send(message);
  }
}

async function connectDatabases(client: Client<true>): Promise<void> {
  console.log("Connecting to databases...");

  await connectDB();
  console.log("Database connected");

  await connectRedis();
  console.log("Redis connected");
  client.initWorker();
}

function setActivity(client: Client<true>, guild: Guild): void {
  client.user.setActivity(`over ${getMemberCount(guild)} monkeys`, {
    type: "WATCHING"
  });
}

async function sendReadyMessage(client: Client<true>): Promise<void> {
  if (client.clientOptions.dev) {
    client.logInBotLogChannel("Ready!");
  } else {
    const botOwner = await client.users.fetch(client.clientOptions.devID);

    client.logInBotLogChannel(
      `${botOwner}, Ready! Make sure to unlock commands`
    );

    botOwner
      .send("Ready! Make sure to unlock commands")
      .catch(() => console.log("Could not send ready message to bot owner"));
  }
}

function getMemberCount(guild: Guild): number {
  return (
    guild.presences?.cache.filter((presence) => presence.status === "online")
      .size ?? guild.memberCount
  );
}
