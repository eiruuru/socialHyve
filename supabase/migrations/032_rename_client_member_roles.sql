-- Rename client member role values: approver → creatives_qa, viewer → guest

ALTER TABLE public.client_members
  DROP CONSTRAINT IF EXISTS client_members_role_check;

ALTER TABLE public.client_invites
  DROP CONSTRAINT IF EXISTS client_invites_role_check;

UPDATE public.client_members SET role = 'creatives_qa' WHERE role = 'approver';
UPDATE public.client_members SET role = 'guest' WHERE role = 'viewer';

UPDATE public.client_invites SET role = 'creatives_qa' WHERE role = 'approver';
UPDATE public.client_invites SET role = 'guest' WHERE role = 'viewer';

ALTER TABLE public.client_members
  ADD CONSTRAINT client_members_role_check
  CHECK (role IN ('creatives_qa', 'guest'));

ALTER TABLE public.client_invites
  ADD CONSTRAINT client_invites_role_check
  CHECK (role IN ('creatives_qa', 'guest'));
