import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UserRole } from '../types/user-role';
import { CreateUserDto } from '../../modules/users/dto/create-user.dto';
import { LoginDto } from '../../modules/auth/dto/login.dto';
import { ZoneDto } from '../../modules/zones/dto/zone.dto';
import { SpeciesDto } from '../../modules/species/dto/species.dto';
import { AnimalDto } from '../../modules/animals/dto/animal.dto';
import { CreateCommentDto } from '../../modules/comments/dto/create-comment.dto';
import { UpdateCommentDto } from '../../modules/comments/dto/update-comment.dto';
import { SearchQueryDto } from '../../modules/indicators/dto/search-query.dto';

const UUID = '6f1c2a5e-8a6b-4c1e-9d2f-3b4a5c6d7e8f';

function check<T extends object>(cls: new () => T, plain: object) {
  const dto = plainToInstance(cls, plain);
  return { dto, failed: validateSync(dto).map((error) => error.property) };
}

describe('request DTOs', () => {
  it('CreateUserDto: normalises the email; password 8-72; valid role', () => {
    const ok = check(CreateUserDto, {
      email: ' John@Mail.COM ',
      password: '12345678',
      role: UserRole.USUARIO,
    });
    expect(ok.failed).toEqual([]);
    expect(ok.dto.email).toBe('john@mail.com');
    expect(
      check(CreateUserDto, {
        email: 'nope',
        password: '1234567',
        role: 'ROOT',
      }).failed.sort(),
    ).toEqual(['email', 'password', 'role']);
    expect(
      check(CreateUserDto, {
        email: 'a@mail.com',
        password: 'x'.repeat(73),
        role: UserRole.ADMIN,
      }).failed,
    ).toEqual(['password']);
  });

  it('LoginDto requires an email and a password', () => {
    expect(
      check(LoginDto, { email: 'a@mail.com', password: 'x' }).failed,
    ).toEqual([]);
    expect(check(LoginDto, { email: 'a', password: '' }).failed.sort()).toEqual(
      ['email', 'password'],
    );
  });

  it('ZoneDto / SpeciesDto / AnimalDto: trimmed names of 3+ chars and uuid references', () => {
    expect(check(ZoneDto, { nombre: '  Sabana ' }).dto.nombre).toBe('Sabana');
    expect(check(ZoneDto, { nombre: '  ab ' }).failed).toEqual(['nombre']);
    expect(
      check(SpeciesDto, { nombre: 'Felinos', id_area: UUID }).failed,
    ).toEqual([]);
    expect(
      check(SpeciesDto, { nombre: 'Felinos', id_area: 'abc' }).failed,
    ).toEqual(['id_area']);
    expect(
      check(AnimalDto, { nombre: 'Leon', id_especie: UUID }).failed,
    ).toEqual([]);
    expect(
      check(AnimalDto, { nombre: 7, id_especie: 'x' }).failed.sort(),
    ).toEqual(['id_especie', 'nombre']);
  });

  it('comment DTOs: 10+ chars, uuid animal, optional uuid parent; update only has the text', () => {
    expect(
      check(CreateCommentDto, { comentario: 'Diez letras', id_animal: UUID })
        .failed,
    ).toEqual([]);
    expect(
      check(CreateCommentDto, {
        comentario: 'corto',
        id_animal: UUID,
        id_comentario_principal: 'x',
      }).failed.sort(),
    ).toEqual(['comentario', 'id_comentario_principal']);
    expect(
      check(UpdateCommentDto, { comentario: '   short   ' }).failed,
    ).toEqual(['comentario']);
  });

  it('SearchQueryDto: search is required and not blank', () => {
    expect(check(SearchQueryDto, { search: ' leon ' }).dto.search).toBe('leon');
    expect(check(SearchQueryDto, {}).failed).toEqual(['search']);
    expect(check(SearchQueryDto, { search: '   ' }).failed).toEqual(['search']);
  });
});
