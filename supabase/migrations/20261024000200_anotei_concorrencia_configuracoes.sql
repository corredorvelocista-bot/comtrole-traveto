-- Anotei: gravação condicional de configurações para detectar concorrência.
-- Aplicar somente após a migração base em ambiente de desenvolvimento.
begin;
create or replace function public.anotei_salvar_configuracoes_condicional(
  p_valores jsonb,
  p_versao_esperada bigint default null
)
returns public.configuracoes_usuario
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_registro public.configuracoes_usuario;
begin
  if v_usuario is null then
    raise exception 'Autenticação obrigatória.' using errcode = '28000';
  end if;
  if p_valores is null or jsonb_typeof(p_valores) <> 'object' then
    raise exception 'As configurações precisam ser um objeto JSON.' using errcode = '22023';
  end if;

  if p_versao_esperada is null then
    insert into public.configuracoes_usuario (usuario_id, valores, versao)
    values (v_usuario, p_valores, 1)
    on conflict (usuario_id) do nothing
    returning * into v_registro;
    if not found then
      raise exception 'Conflito: as configurações já existem; releia antes de gravar.' using errcode = 'P0001';
    end if;
  else
    update public.configuracoes_usuario
       set valores = p_valores, versao = versao + 1
     where usuario_id = v_usuario and versao = p_versao_esperada
     returning * into v_registro;
    if not found then
      raise exception 'Conflito: a versão das configurações mudou em outro dispositivo.' using errcode = 'P0001';
    end if;
  end if;
  return v_registro;
end;
$$;
revoke all on function public.anotei_salvar_configuracoes_condicional(jsonb, bigint) from public, anon;
grant execute on function public.anotei_salvar_configuracoes_condicional(jsonb, bigint) to authenticated;
commit;
