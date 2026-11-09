import { petPhotoPath, type PetView } from '../application/api-contract';
import { strings } from '../domain/strings';

/** A pet's round photo, or an empty circle while there is none. */
export function PetPhoto({ pet, small = false }: { pet: PetView; small?: boolean }) {
  const className = small ? 'pet-photo small' : 'pet-photo';
  if (!pet.photoVersion) return <span className={className} aria-hidden="true" />;
  return <img className={className} src={petPhotoPath(pet.id, pet.photoVersion)} alt={strings.pets.photo.alt(pet.profile.name)} />;
}

/** The portrait filling the arch of the pet's page; null while there is no photo. */
export function PetPortrait({ pet }: { pet: PetView }) {
  if (!pet.photoVersion) return null;
  return <img src={petPhotoPath(pet.id, pet.photoVersion)} alt={strings.pets.photo.alt(pet.profile.name)} />;
}
