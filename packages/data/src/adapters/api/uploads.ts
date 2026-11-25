// Owner uploads through NestJS (T116, docs/api.md "Shop"): a signed place in the shop's storage, then the
// confirm step that checks the real size and type. The shop comes from the owner's login (T34).
import { ConfirmUploadResultSchema, UploadResultSchema } from '@smartapp/core';
import { fetchApi } from '../../api-client';
import type { UploadsAdapter } from '../types';

export function createApiUploadsAdapter(baseUrl: string): UploadsAdapter {
  const json = { 'Content-Type': 'application/json' };
  return {
    createUploadUrl: (input) =>
      fetchApi(`${baseUrl}/owner/uploads`, UploadResultSchema, {
        method: 'POST',
        headers: json,
        body: JSON.stringify(input),
      }),
    confirmUpload: ({ id }) =>
      fetchApi(
        `${baseUrl}/owner/uploads/${encodeURIComponent(id)}/confirm`,
        ConfirmUploadResultSchema,
        { method: 'POST', headers: json, body: '{}' },
      ),
  };
}
