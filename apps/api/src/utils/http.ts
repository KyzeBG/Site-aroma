import type { NextFunction, Request, Response } from "express";

export function asyncHandler<
  TReq extends Request = Request,
  TRes extends Response = Response
>(fn: (req: TReq, res: TRes, next: NextFunction) => Promise<void>) {
  return (req: TReq, res: TRes, next: NextFunction) => {
    void fn(req, res, next).catch(next);
  };
}

