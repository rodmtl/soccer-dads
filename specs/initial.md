# GarageLeague Participant Registration

## webapp

react+tailwind using typescript.

Backend on c# ( .net latest version)

DB: Postgres sql

Monitoring using grafana?

Docker compose

App must be the cheapest way and we may use vercel as the only provider

### Functional requirements:

Users

- Check assistance for a game
- Set a preferred pitch position
- See teams roaster for a specific date

Admin module

- Create games (Only one game per date & per location)
    - Games must include an adress and time
    - Games must be shareable via WhatsApp
- Create & edit players.
    - Player info must include name, player position, age, and a optional: telephone number, email and Facebook profile
    - Each player must have a rating from 0 to 100, every payer will have a 60 as rating by default.
    - A player can be listed in maximum 2 preferred positions. Pitch positions are: goal keeper, defender, midfielder, striker.
    - Rate players and select/change player position on the pitch
- Generate team roaster
    - Roaster generation must be random and based on available player positions and player ratings. The goal is to level teams.
    - Admin can change roaster anytime.
    - Sometimes games are not free so the admin must be able to do a following per player if the payment was done
- It will be ideal in a phase 2 that the admin can post a survey to a whatsapp group and then  the members of the gopu vote and all that will be regsitered into the app.