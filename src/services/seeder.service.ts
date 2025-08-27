import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Zone } from '../models/zone.model';
import { Species } from '../models/species.model';
import { Animal } from '../models/animal.model';
import { Comment } from '../models/comment.model';
import { User } from '../models/user.model';
import { UserRole } from '../types/user.types';
import { DatabaseInitService } from './database-init.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  randAnimal,
  randBetweenDate,
  randCompanyName,
  randEmail,
  randFirstName,
  randLastName,
  randNumber,
  randParagraph,
  randWord,
} from '@ngneat/falso';

@Injectable()
export class SeederService {
  private readonly ZONES_COUNT = this.configService.get<number>(
    'SEEDER_ZONES_COUNT',
    3,
  );
  private readonly SPECIES_PER_ZONE = this.configService.get<number>(
    'SEEDER_SPECIES_PER_ZONE',
    5,
  );
  private readonly ANIMALS_PER_SPECIES = this.configService.get<number>(
    'SEEDER_ANIMALS_PER_SPECIES',
    5,
  );
  private readonly COMMENTS_PER_ANIMAL = this.configService.get<number>(
    'SEEDER_COMMENTS_PER_ANIMAL',
    3,
  );
  private readonly ADDITIONAL_USERS = this.configService.get<number>(
    'SEEDER_ADDITIONAL_USERS',
    5,
  );

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseInitService: DatabaseInitService,
  ) {}

  async shouldRunSeeder(): Promise<boolean> {
    return true;
  }

  private async clearAllData(): Promise<void> {
    console.log('🧹 Limpiando datos existentes...');

    await Comment.destroy({ where: {} });
    await Animal.destroy({ where: {} });
    await Species.destroy({ where: {} });
    await Zone.destroy({ where: {} });
    await User.destroy({ where: {} });

    console.log('✨ Datos limpiados exitosamente');
  }

  private async createAdminUser(): Promise<User> {
    console.log('👤 Creando usuario administrador...');
    const hashedPassword = await bcrypt.hash('admin', 10);
    return User.create({
      id: uuidv4(),
      email: 'admin@admin.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
    });
  }

  private async createAdditionalUsers(): Promise<User[]> {
    console.log('👥 Creando usuarios adicionales...');
    const users: User[] = [];

    for (let i = 0; i < this.ADDITIONAL_USERS; i++) {
      const randomPassword = await bcrypt.hash('password123', 10);
      const user = await User.create({
        id: uuidv4(),
        email: randEmail(),
        password: randomPassword,
        role: Math.random() > 0.9 ? UserRole.ADMIN : UserRole.EMPLEADO,
      });
      users.push(user);
    }

    return users;
  }

  private async createZones(): Promise<Zone[]> {
    console.log('📍 Creando zonas aleatorias...');
    const zones: Zone[] = [];

    for (let i = 0; i < this.ZONES_COUNT; i++) {
      const zone = await Zone.create({
        id: uuidv4(),
        nombre: `${randWord()} ${randCompanyName()}`.substring(0, 50),
      });
      zones.push(zone);
    }

    return zones;
  }

  private async createSpecies(zones: Zone[]): Promise<Species[]> {
    console.log('🦁 Creando especies aleatorias...');
    const allSpecies: Species[] = [];

    for (const zone of zones) {
      for (let i = 0; i < this.SPECIES_PER_ZONE; i++) {
        const species = await Species.create({
          id: uuidv4(),
          nombre: `${randAnimal()} ${randWord()}`.substring(0, 50),
          id_area: zone.id,
        });
        allSpecies.push(species);
      }
    }

    return allSpecies;
  }

  private async createAnimals(
    allSpecies: Species[],
    allUsers: User[],
  ): Promise<Animal[]> {
    console.log('🐾 Creando animales aleatorios...');
    const allAnimals: Animal[] = [];
    const empleadoUsers = allUsers.filter(user => user.role === UserRole.EMPLEADO);

    for (const species of allSpecies) {
      for (let i = 0; i < this.ANIMALS_PER_SPECIES; i++) {
        const randomUser =
          empleadoUsers[Math.floor(Math.random() * empleadoUsers.length)];
        const animal = await Animal.create({
          id: uuidv4(),
          nombre: `${randFirstName()} ${randLastName()}`.substring(0, 50),
          id_especie: species.id,
          id_user: randomUser.id,
          fecha: randBetweenDate({
            from: new Date('2025-08-27'),
            to: new Date(),
          }),
        });
        allAnimals.push(animal);
      }
    }

    return allAnimals;
  }

  private async createComments(allAnimals: Animal[], allUsers: User[]) {
    console.log('💬 Creando comentarios aleatorios...');
    let totalComments = 0;
    const AllCommentsResponse = [];
    const empleadoUsers = allUsers.filter(user => user.role === UserRole.EMPLEADO);

    for (const animal of allAnimals) {
      for (let i = 0; i < this.COMMENTS_PER_ANIMAL; i++) {
        const availableUsers = empleadoUsers.filter(user => user.id !== animal.id_user);
        const randomUser =
          availableUsers[Math.floor(Math.random() * availableUsers.length)];
        const comment = await Comment.create({
          id: uuidv4(),
          comentario: randParagraph({
            length: randNumber({ min: 1, max: 3 }),
          }).join(' '),
          id_animal: animal.id,
          id_user: randomUser.id,
          fecha: randBetweenDate({
            from: animal.fecha,
            to: new Date(),
          }),
        });
        totalComments++;
        AllCommentsResponse.push(comment);
      }
    }

    return { totalComments, AllCommentsResponse };
  }

  private async createCommentsResponse(
    allComments: Comment[],
  ): Promise<number> {
    console.log('🗯️ Creando respuestas a comentarios aleatorios...');
    let totalCommentsResponse = 0;

    for (const comment of allComments) {
      const animalSave = await Animal.findByPk(comment.id_animal);

      await Comment.create({
        id: uuidv4(),
        comentario: randParagraph({
          length: randNumber({ min: 1, max: 3 }),
        }).join(' '),
        id_animal: comment.id_animal,
        id_comentario_principal: comment.id,
        id_user: animalSave.id_user,
        fecha: randBetweenDate({
          from: comment.fecha,
          to: new Date(),
        }),
      });
      totalCommentsResponse++;
    }
    return totalCommentsResponse;
  }

  private printSummary(
    allUsers: User[],
    zones: Zone[],
    allSpecies: Species[],
    allAnimals: Animal[],
    totalComments: number,
    totalCommentsResponse: number,
  ): void {
    console.log('✅ Seeder ejecutado exitosamente');
    console.log(`📊 Resumen de datos generados:`);
    console.log(
      `   - Usuarios: ${allUsers.length} (1 admin + ${this.ADDITIONAL_USERS} empleados)`,
    );
    console.log(`   - Zonas: ${zones.length}`);
    console.log(`   - Especies: ${allSpecies.length}`);
    console.log(`   - Animales: ${allAnimals.length}`);
    console.log(`   - Comentarios: ${totalComments}`);
    console.log(`   - Comentarios respondidos: ${totalCommentsResponse}`);
  }

  async runSeeder(): Promise<void> {
    console.log('🌱 Iniciando seeder con datos aleatorios...');

    try {
      const sequelize = await this.databaseInitService.getSequelizeInstance();

      if (!sequelize) {
        throw new Error('No se pudo obtener la instancia de Sequelize');
      }

      console.log('🔗 Reutilizando conexión existente para el seeder');

      await this.clearAllData();

      const adminUser = await this.createAdminUser();
      const additionalUsers = await this.createAdditionalUsers();
      const allUsers = [adminUser, ...additionalUsers];

      const zones = await this.createZones();
      const allSpecies = await this.createSpecies(zones);
      const allAnimals = await this.createAnimals(allSpecies, allUsers);
      const totalComments = await this.createComments(allAnimals, allUsers);
      const totalCommentsResponse = await this.createCommentsResponse(
        totalComments.AllCommentsResponse,
      );

      this.printSummary(
        allUsers,
        zones,
        allSpecies,
        allAnimals,
        totalComments.totalComments,
        totalCommentsResponse,
      );
    } catch (error) {
      console.error('❌ Error ejecutando el seeder:', error);
      throw error;
    }
  }
}
