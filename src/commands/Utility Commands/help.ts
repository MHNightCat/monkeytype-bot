/** @format */

import { EmbedFieldData } from "discord.js";
import { toPascalCase } from "../../functions/toPascalCase";
import { Command } from "../../interfaces/Command";

export default {
  name: "help",
  description: "Gives you help on all my commands",
  category: "Utility",
  options: [
    {
      name: "command",
      description: "The command to receive help on",
      type: "STRING",
      required: false
    }
  ],
  run: async (interaction, client) => {
    const command = client.commands.get(
      interaction.options.getString("command", false) || ""
    );

    const embed = client.embed(
      {
        title: "Help",
        color: 0xe2b714,
        author: {
          name: interaction.user.username,
          iconURL: interaction.user.avatarURL({ dynamic: true }) ?? ""
        },
        thumbnail: {
          url: client.user.avatarURL({ dynamic: true }) ?? ""
        }
      },
      interaction.user
    );

    if (command) {
      embed
        .setDescription(
          `Here are all the properties for the ${command.name} command!`
        )
        .addFields([
          {
            name: "Command Name",
            value: command.name,
            inline: true
          },
          {
            name: "Command Description",
            value: command.description.trim(),
            inline: true
          }
        ]);

      embed.addFields([
        {
          name: "Command Category",
          value: toPascalCase(command.category),
          inline: true
        }
      ]);
    } else {
      const commands: EmbedFieldData[] = client.categories.map((category) => ({
        name: `${category}${category.endsWith("Commands") ? "" : " Commands"}`,
        value: client
          .getCommandsByCategory(category)
          .filter((cmd) => !cmd.needsPermissions)
          .map((cmd) => cmd.name)
          .join("\n"),
        inline: true
      }));

      embed
        .setDescription("The following are all the commands that I offer!")
        .addFields(commands);
    }

    interaction.reply({ embeds: [embed], ephemeral: true });
  }
} as Command;
