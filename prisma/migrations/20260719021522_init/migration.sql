-- CreateEnum
CREATE TYPE "Position" AS ENUM ('goalkeeper', 'defender', 'midfielder', 'striker');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('confirmed', 'declined', 'no_response');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "positions" "Position"[],
    "rating" INTEGER NOT NULL DEFAULT 60,
    "phone" TEXT,
    "email" TEXT,
    "facebook_profile" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TIME NOT NULL,
    "location_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "number_of_teams" INTEGER NOT NULL DEFAULT 2,
    "share_text" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'no_response',
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_assignments" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "team_index" INTEGER NOT NULL,
    "assigned_position" "Position" NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,

    CONSTRAINT "team_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "amount" DECIMAL(10,2),
    "marked_by" TEXT NOT NULL,
    "marked_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "games_date_location_name_key" ON "games"("date", "location_name");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_game_id_player_id_key" ON "attendances"("game_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_assignments_game_id_player_id_key" ON "team_assignments"("game_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_game_id_player_id_key" ON "payments"("game_id", "player_id");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
