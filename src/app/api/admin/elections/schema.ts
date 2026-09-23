import { z } from "zod";
import { common, elections } from "@/lib/messages";

const title = z.string(elections.titleRequired);
const startsAt = z.string(elections.startRequired);
const durationMinutes = z.number(elections.durationInvalid);
const flag = z.boolean(common.invalidBody);

export const electionCreateSchema = z.object({
  title,
  hidden: flag.optional().default(true),
  startsAt,
  durationMinutes,
  allowBlank: flag.optional().default(false),
  shuffleCandidates: flag.optional().default(false),
  showResults: flag.optional().default(true),
});

export const electionUpdateSchema = z.object({
  title: title.optional(),
  hidden: flag.optional(),
  startsAt: startsAt.optional(),
  durationMinutes: durationMinutes.optional(),
  allowBlank: flag.optional(),
  shuffleCandidates: flag.optional(),
  showResults: flag.optional(),
});

export const electionCloseSchema = z.object({
  closesAt: z.string(elections.closeRequired),
});

const fullName = z.string(elections.candidateNameRequired);
const photo = z.string(common.invalidBody).nullable();

export const candidateCreateSchema = z.object({
  fullName,
  photo: photo.optional().default(null),
});

export const candidateUpdateSchema = z.object({
  fullName: fullName.optional(),
  photo: photo.optional(),
});
