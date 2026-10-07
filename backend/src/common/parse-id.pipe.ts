import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const MAX_INT4 = 2_147_483_647; // ids are PostgreSQL integers

/** Parses a route id; rejects anything that is not a valid database id. */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1 || id > MAX_INT4) {
      throw new BadRequestException('id must be a positive integer');
    }
    return id;
  }
}
