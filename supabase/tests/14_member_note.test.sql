begin;
select plan(4);

select has_column('public', 'members', 'note', 'members.note exists');
select col_is_null('public', 'members', 'note', 'members.note is optional');

insert into public.tenants (id, slug, name, kind, stage, price_monthly)
values ('00000000-0000-0000-0000-00000000a14e', 'note-test-shop', 'Note test', 'food', 'setting_up', 39900);

select throws_ok(
  $$insert into public.members (tenant_id, name, email, member_code, note)
    values ('00000000-0000-0000-0000-00000000a14e', 'Ana', 'ana@example.com', 'NT-1001', repeat('x', 301))$$,
  '23514', null, 'a note longer than 300 characters is refused'
);

select throws_ok(
  $$insert into public.members (tenant_id, name, member_code, erased_at, note)
    values ('00000000-0000-0000-0000-00000000a14e', 'Gone', 'NT-1002', now(), 'less ice')$$,
  '23514', null, 'an erased member keeps no note'
);

select * from finish();
rollback;
