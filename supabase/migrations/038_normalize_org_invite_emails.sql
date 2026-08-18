-- Normalize organization invite emails to lowercase (client invites already lowercase).

UPDATE public.organization_invites
SET email = lower(trim(email))
WHERE email <> lower(trim(email));
